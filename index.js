const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

const prefix = '!';
const db = new Map(); // Kullanıcı verilerini tutan bellek tabanlı veritabanı

client.once('ready', () => {
    console.log(`VaXeD Bot başarıyla giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // Kullanıcı ilk defa komut kullanıyorsa varsayılan verilerini oluşturalım
    if (!db.has(userId)) {
        db.set(userId, { bakiye: 1000, gun: 1, seviye: 1, xp: 0 });
    }
    let userData = db.get(userId);

    // ================= ÜYE KOMUTLARI ================= //

    // 1. Vyardım
    if (command === 'vyardım') {
        const embed = new EmbedBuilder()
            .setTitle("✨ VaXeD Bot - Komut Merkezi")
            .setDescription("Sunucumuzun ekonomi, eğlence ve yönetim komutları aşağıdadır:")
            .addFields(
                { name: "🛡️ ÜYE KOMUTLARI", value: "`Voylama`, `Vgünlük`, `Vday`, `Vmine`, `Vkiss`, `Vyardım`, `Vcf`, `Vbakiye`, `Vpay`, `Vbaltop`, `Vstats`, `Vseviye`, `Vrank`, `Vödül`, `Vping`, `Vavatar`, `Vsunucu`, `VAI`", inline: false },
                { name: "⚙️ ADMİN KOMUTLARI", value: "`Vçekiliş oluştur`, `VAIticket`, `!vaiticket-kur`", inline: false }
            )
            .setColor(0x5865F2);
        return message.reply({ embeds: [embed] });
    }

    // 2. Vbakiye
    if (command === 'vbakiye') {
        return message.reply(`💰 Cüzdanın: **${userData.bakiye}** bakiye.`);
    }

    // 3. Vgünlük
    if (command === 'vgünlük') {
        userData.bakiye += 1000;
        db.set(userId, userData);
        return message.reply(`🎁 Günlük ödülün alındı! **+1000 bakiye** eklendi. Güncel bakiye: **${userData.bakiye}**`);
    }

    // 4. Vmine (OwO Tarzı Beyaz Tuşlu Mines / Mayın Tarlası Oyunu)
    if (command === 'vmine') {
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar <= 0) {
            return message.reply("❌ Lütfen geçerli bir bahis miktarı gir! Örnek: `!vmine 100`");
        }
        if (userData.bakiye < miktar) {
            return message.reply(`❌ Yeterli bakiyen yok! Mevcut bakiyen: \`${userData.bakiye}\``);
        }

        userData.bakiye -= miktar;
        db.set(userId, userData);

        let kazancCarpani = 1.0;
        let mayinlar = [];
        while (mayinlar.length < 3) {
            let r = Math.floor(Math.random() * 9);
            if (!mayinlar.includes(r)) mayinlar.push(r);
        }
        let acilanKutular = Array(9).fill(false);

        function gridOlustur(bitti mi = false) {
            let rows = [];
            for (let i = 0; i < 3; i++) {
                let row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    let index = i * 3 + j;
                    let btn = new ButtonBuilder().setCustomId(`mine_${index}`);
                    if (acilanKutular[index]) {
                        if (mayinlar.includes(index) && bitti) {
                            btn.setEmoji('💣').setStyle(ButtonStyle.Danger).setDisabled(true);
                        } else {
                            btn.setEmoji('💎').setStyle(ButtonStyle.Success).setDisabled(true);
                        }
                    } else {
                        // Açılmamış tuşlar tam istediğin gibi BEYAZ / GRİ (ButtonStyle.Secondary) yapıldı!
                        if (bitti && mayinlar.includes(index)) {
                            btn.setEmoji('💣').setStyle(ButtonStyle.Secondary).setDisabled(true);
                        } else {
                            btn.setEmoji('❓').setStyle(ButtonStyle.Secondary);
                        }
                    }
                    row.addComponents(btn);
                }
                rows.push(row);
            }
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('cashout')
                    .setLabel(bitti ? 'Oyun Bitti' : `Cash Out (${Math.floor(miktar * kazancCarpani)})`)
                    .setStyle(bitti ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(bitti)
            ));
            return rows;
        }

        const embed = new EmbedBuilder()
            .setTitle("⛏️ VaXeD Mines Oyunu")
            .setDescription(`**Bet:** ${miktar} | **Mines:** 3\n**Cash Out:** ${Math.floor(miktar * kazancCarpani)} (${kazancCarpani.toFixed(2)}x)`)
            .setColor(0x3498DB);

        const sentMsg = await message.reply({ embeds: [embed], components: gridOlustur(false) });
        const collector = sentMsg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) {
                return i.reply({ content: "❌ Bu oyun sadece komutu başlatan kişiye ait!", ephemeral: true });
            }

            if (i.customId === 'cashout') {
                let kazanilan = Math.floor(miktar * kazancCarpani);
                userData.bakiye += kazanilan;
                db.set(userId, userData);
                embed.setColor(0x2ECC71).setDescription(`🎉 **Cash Out Başarılı!** Kazancın: **+${kazanilan}** bakiye.`);
                await i.update({ embeds: [embed], components: gridOlustur(true) });
                return collector.stop();
            }

            if (i.customId.startsWith('mine_')) {
                let index = parseInt(i.customId.split('_')[1]);
                if (mayinlar.includes(index)) {
                    acilanKutular[index] = true;
                    embed.setColor(0xE74C3C).setDescription(`💥 **Mayına bastın!** Kaybettin. Bahis: \`-${miktar}\``);
                    await i.update({ embeds: [embed], components: gridOlustur(true) });
                    return collector.stop();
                } else {
                    acilanKutular[index] = true;
                    kazancCarpani += 0.41;
                    embed.setDescription(`**Bet:** ${miktar} | **Mines:** 3\n**Cash Out:** ${Math.floor(miktar * kazancCarpani)} (${kazancCarpani.toFixed(2)}x)`);
                    await i.update({ embeds: [embed], components: gridOlustur(false) });
                }
            }
        });
    }

    // 5. Vcf (Yazı-Tura Oyunu)
    if (command === 'vcf') {
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar <= 0 || userData.bakiye < miktar) {
            return message.reply("❌ Geçerli bir miktar girmelisin veya yetersiz bakiyen var!");
        }
        userData.bakiye -= miktar;
        db.set(userId, userData);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cf_yazi').setLabel('🪙 Yazı').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cf_tura').setLabel('🪙 Tura').setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
            .setTitle("🪙 Coinflip (Yazı-Tura)")
            .setDescription("Tarafını seçmek için aşağıdaki butonlara tıkla:")
            .setColor(0xF1C40F);

        const sentMsg = await message.reply({ embeds: [embed], components: [row] });
        const collector = sentMsg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: "❌ Bu işlem sana ait değil!", ephemeral: true });
            let secim = i.customId === 'cf_yazi' ? 'Yazı' : 'Tura';
            let sonuc = Math.random() < 0.5 ? 'Yazı' : 'Tura';
            let kazandi = (secim === sonuc);

            if (kazandi) userData.bakiye += (miktar * 2);
            db.set(userId, userData);

            embed.setColor(kazandi ? 0x2ECC71 : 0xE74C3C)
                 .setDescription(`Seçimin: **${secim}** | Gelen: **${sonuc}**\n${kazandi ? '🎉 Kazandın!' : '😢 Kaybettin!'}`);
            await i.update({ embeds: [embed], components: [] });
            collector.stop();
        });
    }

    // 6. Vkiss (Kiss GIF)
    if (command === 'vkiss') {
        const member = message.mentions.members.first();
        if (!member) return message.reply("❌ Öpüştüğün kişiyi etiketlemelisin! Örnek: `!vkiss @kullanici`");
        const kissGifs = [
            "https://media.giphy.com/media/GCLlQnV7wzKRG/giphy.gif",
            "https://media.giphy.com/media/hnNyVPLXWdANy/giphy.gif"
        ];
        let rastgeleGif = kissGifs[Math.floor(Math.random() * kissGifs.length)];
        const embed = new EmbedBuilder()
            .setDescription(`💋 ${message.author} kurban seçtiği ${member} kişisini öptü!`)
            .setImage(rastgeleGif)
            .setColor(0xFF69B4);
        return message.reply({ embeds: [embed] });
    }

    // 7. Diğer Üye Komutları
    if (command === 'vday') return message.reply(`📅 Sunucudaki aktif gün sayacın: **${userData.gun} gün**`);
    if (command === 'voylama') return message.reply("📊 Oylama sistemi aktif! Kullanım: `!voylama [soru]`");
    if (command === 'vpay') {
        const hedef = message.mentions.users.first();
        const miktar = parseInt(args[1]);
        if (!hedef || isNaN(miktar) || miktar <= 0 || userData.bakiye < miktar) {
            return message.reply("❌ Kullanım: `!vpay @kullanici miktar`");
        }
        userData.bakiye -= miktar;
        db.set(userId, userData);
        if (!db.has(hedef.id)) db.set(hedef.id, { bakiye: 1000, gun: 1, seviye: 1, xp: 0 });
        let hedefData = db.get(hedef.id);
        hedefData.bakiye += miktar;
        db.set(hedef.id, hedefData);
        return message.reply(`💸 Başarıyla ${hedef} kişisine **${miktar} bakiye** gönderildi.`);
    }
    if (command === 'vbaltop') return message.reply("🏆 Bakiye sıralama tablosu güncelleniyor.");
    if (command === 'vstats') return message.reply(`📊 İstatistiklerin:\nSeviye: **${userData.seviye}**\nBakiye: **${userData.bakiye}**\nGün: **${userData.gun}**`);
    if (command === 'vseviye' || command === 'vrank') return message.reply(`⭐ Mevcut Seviyen: **${userData.seviye}** (XP durumun iyi gidiyor!)`);
    if (command === 'vödül') return message.reply("🎁 Toplanabilir aktif özel ödüller bulunuyor.");
    if (command === 'vping') return message.reply(`🏓 Pong! Gecikme: **${client.ws.ping}ms**`);
    if (command === 'vavatar') return message.reply({ files: [message.author.displayAvatarURL({ dynamic: true, size: 1024 })] });
    if (command === 'vsunucu') return message.reply(`🏰 Sunucu: **${message.guild.name}** | Üye Sayısı: **${message.guild.memberCount}**`);
    if (command === 'vai') return message.reply("🤖 Selam! VaXeD AI aktif, sana nasıl yardımcı olabilirim?");


    // ================= ADMİN KOMUTLARI ================= //

    if (command === 'vçekiliş' && args[0] === 'oluştur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Bu komutu sadece yöneticiler kullanabilir!");
        }
        return message.reply("🎉 Çekiliş başarıyla başlatıldı! Katılmak için emojiye tıklayın.");
    }
});


// ================= AI TICKET SİSTEMİ (VAIticket) ================= //

// Ticket Kurulum Komutu (Admin)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content === '!vaiticket-kur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Bu komutu sadece yöneticiler kullanabilir!");
        }

        const embed = new EmbedBuilder()
            .setTitle("🎫 VaXeD AI Destek Sistemi")
            .setDescription("Yardıma mı ihtiyacın var? Aşağıdaki **Destek Talebi Aç** butonuna tıklayarak yapay zeka destekli özel odanı oluşturabilirsin!")
            .setColor(0x5865F2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_ac')
                .setLabel('🎫 Destek Talebi Aç')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    }
});

// Ticket Buton Etkileşimleri
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'ticket_ac') {
        const guild = interaction.guild;
        const user = interaction.user;

        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ],
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle("🤖 VaXeD AI Destek Asistanı")
            .setDescription(`Merhaba ${user}, destek talebine hoş geldin!\n\nBen VaXeD AI asistanıyım. Sorununu ya da talebini buraya detaylıca yazabilirsin. Gerekirse yetkilileri etiketleyeceğim.`)
            .setColor(0x2ECC71);

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_kapat')
                .setLabel('🔒 Talebi Kapat')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${user}`, embeds: [welcomeEmbed], components: [closeRow] });
        await interaction.reply({ content: `✅ Destek kanalın oluşturuldu: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.customId === 'ticket_kapat') {
        const channel = interaction.channel;
        await interaction.reply("🔒 Destek talebi kapatılıyor...");
        setTimeout(() => channel.delete().catch(() => {}), 3000);
    }
});

client.login('TOKEN_BURAYA');
