const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configurações do bot
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '844336803096166410'; // ID do dono do bot

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Funções para carregar e salvar dados
function carregarDados(arquivo) {
    try {
        const caminho = path.join(__dirname, arquivo);
        if (fs.existsSync(caminho)) {
            return JSON.parse(fs.readFileSync(caminho, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error(`Erro ao carregar ${arquivo}:`, error);
        return {};
    }
}

function salvarDados(arquivo, dados) {
    try {
        const caminho = path.join(__dirname, arquivo);
        fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
        console.log(`✅ ${arquivo} salvo com sucesso!`);
    } catch (error) {
        console.error(`Erro ao salvar ${arquivo}:`, error);
    }
}

// Carregar dados
let pedidos = carregarDados('pedidos.json');
let cargos = carregarDados('cargos.json');
let config = carregarDados('config.json');
let servidores = carregarDados('servidores.json');

// Verificar se servidor está autorizado
function servidorAutorizado(guildId) {
    return servidores.autorizados && servidores.autorizados[guildId];
}

// Verificar se usuário é admin do servidor ou admin adicional
function isAdminOuAdicional(guildId, userId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;
    
    const member = guild.members.cache.get(userId);
    if (!member) return false;
    
    // Verificar se é admin do servidor
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    // Verificar se é dono do bot
    if (userId === BOT_OWNER_ID) return true;
    
    // Verificar se é admin adicional
    const configServidor = config[guildId];
    if (configServidor && configServidor.adminsAdicionais && configServidor.adminsAdicionais[userId]) {
        return true;
    }
    
    return false;
}

// Verificar se usuário é admin do servidor ou admin adicional
function isServerAdmin(guildId, userId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;
  
  const member = guild.members.cache.get(userId);
  if (!member) return false;
  
  // Verificar se é admin do servidor
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  
  // Verificar se é dono do bot
  if (userId === DONO_BOT_ID) return true;
  
  // Verificar se é admin adicional
  const serverConfig = getServerConfig(guildId);
  if (serverConfig.adminsAdicionais && serverConfig.adminsAdicionais[userId]) {
    return true;
  }
  
  return false;
}

// Comandos slash
const commands = [
    new SlashCommandBuilder()
        .setName('aprovar-servidor')
        .setDescription('Aprovar servidor para usar o bot (apenas dono do bot)')
        .addStringOption(option =>
            option.setName('servidor_id')
                .setDescription('ID do servidor para aprovar')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('gerenciar-cargos')
        .setDescription('Gerenciar cargos liberados para aprovação (apenas admins)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adicionar cargo aos liberados')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo para liberar')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remover cargo dos liberados')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo para remover')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Listar cargos liberados')
        ),
    
    new SlashCommandBuilder()
        .setName('gerenciar-admins')
        .setDescription('Gerenciar admins adicionais (apenas admin principal)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar')
                .setDescription('Adicionar admin adicional')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para tornar admin adicional')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover')
                .setDescription('Remover admin adicional')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuário para remover como admin adicional')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('listar')
                .setDescription('Listar admins adicionais')
        ),
    
    new SlashCommandBuilder()
        .setName('pedir-tag')
        .setDescription('Solicitar aprovação de tag')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Seu nome completo')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Seu ID no jogo')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configurar canais do bot (apenas admins)')
        .addChannelOption(option =>
            option.setName('canal_pedidos')
                .setDescription('Canal para pedidos de tag')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('canal_aprovacao')
                .setDescription('Canal para aprovação de tags')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('canal_resultados')
                .setDescription('Canal para resultados')
                .setRequired(true)
        )
];

// Registrar comandos
async function registrarComandos() {
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        console.log('🔄 Registrando comandos slash...');
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        
        console.log('✅ Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot logado como ${client.user.tag}!`);
    await registrarComandos();
});

// Evento quando bot entra em servidor
client.on('guildCreate', async (guild) => {
    console.log(`📥 Bot adicionado ao servidor: ${guild.name} (${guild.id})`);
    
    // Adicionar à lista de pendentes
    if (!servidores.pendentes) servidores.pendentes = {};
    servidores.pendentes[guild.id] = {
        nome: guild.name,
        timestamp: Date.now()
    };
    salvarDados('servidores.json', servidores);
    
    // Enviar mensagem para o dono do bot
    try {
        const owner = await client.users.fetch(BOT_OWNER_ID);
        const embed = new EmbedBuilder()
            .setTitle('🆕 Novo Servidor Adicionado')
            .setDescription(`O bot foi adicionado ao servidor **${guild.name}**`)
            .addFields(
                { name: '🆔 ID do Servidor', value: guild.id, inline: true },
                { name: '👥 Membros', value: guild.memberCount.toString(), inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_servidor_${guild.id}`)
                    .setLabel('✅ Aprovar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`rejeitar_servidor_${guild.id}`)
                    .setLabel('❌ Rejeitar')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await owner.send({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Erro ao notificar dono do bot:', error);
    }
});

// Comandos slash
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    const { commandName, guildId, user } = interaction;
    
    // Comando para aprovar servidor (apenas dono do bot)
    if (commandName === 'aprovar-servidor') {
        if (user.id !== BOT_OWNER_ID) {
            return interaction.reply({ content: '❌ Apenas o dono do bot pode usar este comando!', ephemeral: true });
        }
        
        const servidorId = interaction.options.getString('servidor_id');
        const guild = client.guilds.cache.get(servidorId);
        
        if (!guild) {
            return interaction.reply({ content: '❌ Servidor não encontrado!', ephemeral: true });
        }
        
        // Aprovar servidor
        if (!servidores.autorizados) servidores.autorizados = {};
        servidores.autorizados[servidorId] = {
            nome: guild.name,
            aprovadoPor: user.id,
            timestamp: Date.now()
        };
        
        // Remover dos pendentes
        if (servidores.pendentes && servidores.pendentes[servidorId]) {
            delete servidores.pendentes[servidorId];
        }
        
        salvarDados('servidores.json', servidores);
        
        return interaction.reply({ content: `✅ Servidor **${guild.name}** aprovado com sucesso!`, ephemeral: true });
    }
    
    // Verificar se servidor está autorizado para outros comandos
    if (!servidorAutorizado(guildId)) {
        return interaction.reply({ content: '❌ Este servidor não está autorizado a usar o bot!', ephemeral: true });
    }
    
    // Setup do bot
    if (commandName === 'setup') {
        if (!isAdminOuAdicional(guildId, user.id)) {
            return interaction.reply({ content: '❌ Apenas administradores podem usar este comando!', ephemeral: true });
        }
        
        const canalPedidos = interaction.options.getChannel('canal_pedidos');
        const canalAprovacao = interaction.options.getChannel('canal_aprovacao');
        const canalResultados = interaction.options.getChannel('canal_resultados');
        
        if (!config[guildId]) config[guildId] = {};
        
        config[guildId].pedirTagId = canalPedidos.id;
        config[guildId].aprovarTagId = canalAprovacao.id;
        config[guildId].resultadosId = canalResultados.id;
        
        salvarDados('config.json', config);
        
        return interaction.reply({ 
            content: `✅ Configuração salva!\n📝 Pedidos: ${canalPedidos}\n✅ Aprovação: ${canalAprovacao}\n📊 Resultados: ${canalResultados}`, 
            ephemeral: true 
        });
    }
    
    // Gerenciar cargos
    if (commandName === 'gerenciar-cargos') {
        if (!isAdminOuAdicional(guildId, user.id)) {
            return interaction.reply({ content: '❌ Apenas administradores podem usar este comando!', ephemeral: true });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (!config[guildId]) config[guildId] = {};
        if (!config[guildId].cargosLiberados) config[guildId].cargosLiberados = {};
        
        if (subcommand === 'adicionar') {
            const cargo = interaction.options.getRole('cargo');
            config[guildId].cargosLiberados[cargo.id] = cargo.name;
            salvarDados('config.json', config);
            
            return interaction.reply({ content: `✅ Cargo **${cargo.name}** adicionado aos liberados!`, ephemeral: true });
        }
        
        if (subcommand === 'remover') {
            const cargo = interaction.options.getRole('cargo');
            if (config[guildId].cargosLiberados[cargo.id]) {
                delete config[guildId].cargosLiberados[cargo.id];
                salvarDados('config.json', config);
                return interaction.reply({ content: `✅ Cargo **${cargo.name}** removido dos liberados!`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ Cargo **${cargo.name}** não estava liberado!`, ephemeral: true });
            }
        }
        
        if (subcommand === 'listar') {
            const cargosLiberados = config[guildId].cargosLiberados || {};
            const lista = Object.entries(cargosLiberados).map(([id, nome]) => `• ${nome}`).join('\n') || 'Nenhum cargo liberado';
            
            const embed = new EmbedBuilder()
                .setTitle('📋 Cargos Liberados')
                .setDescription(lista)
                .setColor('#0099ff');
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    // Gerenciar admins adicionais
    if (commandName === 'gerenciar-admins') {
        const member = interaction.guild.members.cache.get(user.id);
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && user.id !== BOT_OWNER_ID) {
            return interaction.reply({ content: '❌ Apenas administradores principais podem usar este comando!', ephemeral: true });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (!config[guildId]) config[guildId] = {};
        if (!config[guildId].adminsAdicionais) config[guildId].adminsAdicionais = {};
        
        if (subcommand === 'adicionar') {
            const usuario = interaction.options.getUser('usuario');
            config[guildId].adminsAdicionais[usuario.id] = usuario.username;
            salvarDados('config.json', config);
            
            return interaction.reply({ content: `✅ **${usuario.username}** adicionado como admin adicional!`, ephemeral: true });
        }
        
        if (subcommand === 'remover') {
            const usuario = interaction.options.getUser('usuario');
            if (config[guildId].adminsAdicionais[usuario.id]) {
                delete config[guildId].adminsAdicionais[usuario.id];
                salvarDados('config.json', config);
                return interaction.reply({ content: `✅ **${usuario.username}** removido dos admins adicionais!`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ **${usuario.username}** não era admin adicional!`, ephemeral: true });
            }
        }
        
        if (subcommand === 'listar') {
            const adminsAdicionais = config[guildId].adminsAdicionais || {};
            const lista = Object.entries(adminsAdicionais).map(([id, nome]) => `• ${nome}`).join('\n') || 'Nenhum admin adicional';
            
            const embed = new EmbedBuilder()
                .setTitle('👥 Admins Adicionais')
                .setDescription(lista)
                .setColor('#0099ff');
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    
    // Pedir tag
    if (commandName === 'pedir-tag') {
        const configServidor = config[guildId];
        if (!configServidor || !configServidor.pedirTagId) {
            return interaction.reply({ content: '❌ Bot não configurado neste servidor! Use `/setup` primeiro.', ephemeral: true });
        }
        
        const nome = interaction.options.getString('nome');
        const id = interaction.options.getString('id');
        
        // Verificar se já tem pedido pendente
        if (pedidos[user.id] && pedidos[user.id].status === 'pendente') {
            return interaction.reply({ content: '❌ Você já tem um pedido pendente!', ephemeral: true });
        }
        
        // Salvar pedido
        if (!pedidos[guildId]) pedidos[guildId] = {};
        pedidos[user.id] = {
            nome,
            id,
            timestamp: Date.now(),
            status: 'pendente',
            guildId
        };
        salvarDados('pedidos.json', pedidos);
        
        // Enviar para canal de aprovação
        const canalAprovacao = client.channels.cache.get(configServidor.aprovarTagId);
        if (canalAprovacao) {
            const embed = new EmbedBuilder()
                .setTitle('📝 Nova Solicitação de Tag')
                .addFields(
                    { name: '👤 Usuário', value: `<@${user.id}>`, inline: true },
                    { name: '📛 Nome', value: nome, inline: true },
                    { name: '🆔 ID', value: id, inline: true }
                )
                .setColor('#ffff00')
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aprovar_${user.id}`)
                        .setLabel('✅ Aprovar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reprovar_${user.id}`)
                        .setLabel('❌ Reprovar')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await canalAprovacao.send({ embeds: [embed], components: [row] });
        }
        
        return interaction.reply({ content: '✅ Pedido enviado para aprovação!', ephemeral: true });
    }
});

// Interações com botões e menus
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    
    const { customId, user, guildId } = interaction;
    
    // Aprovação/Rejeição de servidores (apenas dono do bot)
    if (customId.startsWith('aprovar_servidor_') || customId.startsWith('rejeitar_servidor_')) {
        if (user.id !== BOT_OWNER_ID) {
            return interaction.reply({ content: '❌ Apenas o dono do bot pode fazer isso!', ephemeral: true });
        }
        
        const servidorId = customId.split('_')[2];
        const guild = client.guilds.cache.get(servidorId);
        
        if (customId.startsWith('aprovar_servidor_')) {
            if (!servidores.autorizados) servidores.autorizados = {};
            servidores.autorizados[servidorId] = {
                nome: guild ? guild.name : 'Servidor Desconhecido',
                aprovadoPor: user.id,
                timestamp: Date.now()
            };
            
            if (servidores.pendentes && servidores.pendentes[servidorId]) {
                delete servidores.pendentes[servidorId];
            }
            
            salvarDados('servidores.json', servidores);
            
            return interaction.update({ 
                content: `✅ Servidor aprovado com sucesso!`, 
                embeds: [], 
                components: [] 
            });
        } else {
            if (servidores.pendentes && servidores.pendentes[servidorId]) {
                delete servidores.pendentes[servidorId];
            }
            salvarDados('servidores.json', servidores);
            
            // Sair do servidor
            if (guild) {
                await guild.leave();
            }
            
            return interaction.update({ 
                content: `❌ Servidor rejeitado e bot removido!`, 
                embeds: [], 
                components: [] 
            });
        }
    }
    
    // Verificar se servidor está autorizado
    if (!servidorAutorizado(guildId)) {
        return interaction.reply({ content: '❌ Este servidor não está autorizado!', ephemeral: true });
    }
    
    // Aprovação de tags
    if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
        if (!isAdminOuAdicional(guildId, user.id)) {
            return interaction.reply({ content: '❌ Apenas administradores podem aprovar/reprovar!', ephemeral: true });
        }
        
        const userId = customId.split('_')[1];
        const pedido = pedidos[userId];
        
        if (!pedido || pedido.status !== 'pendente') {
            return interaction.reply({ content: '❌ Pedido não encontrado ou já processado!', ephemeral: true });
        }
        
        if (customId.startsWith('aprovar_')) {
            // Mostrar menu de cargos liberados
            const configServidor = config[guildId];
            const cargosLiberados = configServidor?.cargosLiberados || {};
            
            if (Object.keys(cargosLiberados).length === 0) {
                return interaction.reply({ content: '❌ Nenhum cargo liberado para aprovação! Configure primeiro com `/gerenciar-cargos`.', ephemeral: true });
            }
            
            const options = Object.entries(cargosLiberados).map(([id, nome]) => ({
                label: nome,
                value: id,
                description: `Aplicar cargo: ${nome}`
            }));
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`selecionar_cargo_${userId}`)
                .setPlaceholder('Selecione um cargo para aplicar')
                .addOptions(options);
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            return interaction.reply({ 
                content: '🎯 Selecione o cargo para aplicar:', 
                components: [row], 
                ephemeral: true 
            });
        } else {
            // Reprovar
            pedidos[userId].status = 'reprovado';
            pedidos[userId].responsavel = user.id;
            salvarDados('pedidos.json', pedidos);
            
            // Enviar resultado
            const configServidor = config[guildId];
            const canalResultados = client.channels.cache.get(configServidor.resultadosId);
            
            if (canalResultados) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Tag Reprovada')
                    .addFields(
                        { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
                        { name: '📛 Nome', value: pedido.nome, inline: true },
                        { name: '🆔 ID', value: pedido.id, inline: true },
                        { name: '👮 Responsável', value: `<@${user.id}>`, inline: true }
                    )
                    .setColor('#ff0000')
                    .setTimestamp();
                
                await canalResultados.send({ embeds: [embed] });
            }
            
            return interaction.update({ 
                content: '❌ Tag reprovada!', 
                embeds: [], 
                components: [] 
            });
        }
    }
    
    // Seleção de cargo
    if (customId.startsWith('selecionar_cargo_')) {
        if (!isAdminOuAdicional(guildId, user.id)) {
            return interaction.reply({ content: '❌ Apenas administradores podem fazer isso!', ephemeral: true });
        }
        
        const userId = customId.split('_')[2];
        const cargoId = interaction.values[0];
        const pedido = pedidos[userId];
        
        if (!pedido || pedido.status !== 'pendente') {
            return interaction.reply({ content: '❌ Pedido não encontrado ou já processado!', ephemeral: true });
        }
        
        // Aprovar pedido
        pedidos[userId].status = 'aprovado';
        pedidos[userId].cargo = cargoId;
        pedidos[userId].responsavel = user.id;
        salvarDados('pedidos.json', pedidos);
        
        // Aplicar cargo e atualizar nickname
        try {
            const guild = client.guilds.cache.get(guildId);
            const member = await guild.members.fetch(userId);
            const cargo = guild.roles.cache.get(cargoId);
            
            if (member && cargo) {
                await member.roles.add(cargo);
                
                // Atualizar nickname com formato: [CARGO] Nome | ID
                const novoNick = `${cargo.name} ${pedido.nome} | ${pedido.id}`;
                await member.setNickname(novoNick);
            }
        } catch (error) {
            console.error('Erro ao aplicar cargo/nickname:', error);
        }
        
        // Enviar resultado
        const configServidor = config[guildId];
        const canalResultados = client.channels.cache.get(configServidor.resultadosId);
        
        if (canalResultados) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Tag Aprovada')
                .addFields(
                    { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
                    { name: '📛 Nome', value: pedido.nome, inline: true },
                    { name: '🆔 ID', value: pedido.id, inline: true },
                    { name: '🎯 Cargo', value: `<@&${cargoId}>`, inline: true },
                    { name: '👮 Responsável', value: `<@${user.id}>`, inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp();
            
            await canalResultados.send({ embeds: [embed] });
        }
        
        return interaction.update({ 
            content: '✅ Tag aprovada e cargo aplicado!', 
            components: [] 
        });
    }
});

// Tratamento de erros
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Login do bot
if (!TOKEN) {
    console.error('❌ Token do Discord não encontrado! Defina a variável DISCORD_TOKEN');
    process.exit(1);
}

client.login(TOKEN).catch(error => {
    console.error('❌ Erro ao fazer login:', error);
    process.exit(1);
});